import { useSession } from "next-auth/client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import classNames from "@lib/classNames";
import { useLocale } from "@lib/hooks/useLocale";
import { trpc } from "@lib/trpc";
import { Webhook } from "@lib/webhook";

import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTrigger } from "@components/Dialog";
import { List, ListItem, ListItemText, ListItemTitle } from "@components/List";
import Loader from "@components/Loader";
import { ShellSubHeading } from "@components/Shell";
import Button from "@components/ui/Button";
import Switch from "@components/ui/Switch";
import EditWebhook from "@components/webhook/EditWebhook";
import WebhookList from "@components/webhook/WebhookList";

export default function Embed() {
  const user = trpc.useQuery(["viewer.me"]).data;
  const [, loading] = useSession();
  const { t } = useLocale();

  const [isLoading, setLoading] = useState(false);
  const [bookingCreated, setBookingCreated] = useState(true);
  const [bookingRescheduled, setBookingRescheduled] = useState(true);
  const [bookingCancelled, setBookingCancelled] = useState(true);
  const [editWebhookEnabled, setEditWebhookEnabled] = useState(false);
  const [webhooks, setWebhooks] = useState([]);
  const [webhookToEdit, setWebhookToEdit] = useState<Webhook | null>();
  const [webhookEventTrigger, setWebhookEventTriggers] = useState([
    "BOOKING_CREATED",
    "BOOKING_RESCHEDULED",
    "BOOKING_CANCELLED",
  ]);

  const subUrlRef = useRef<HTMLInputElement>() as React.MutableRefObject<HTMLInputElement>;

  useEffect(() => {
    const arr = [];
    bookingCreated && arr.push("BOOKING_CREATED");
    bookingRescheduled && arr.push("BOOKING_RESCHEDULED");
    bookingCancelled && arr.push("BOOKING_CANCELLED");
    setWebhookEventTriggers(arr);
  }, [bookingCreated, bookingRescheduled, bookingCancelled]);

  useEffect(() => {
    getWebhooks();
  }, []);

  const iframeTemplate = `<iframe src="${process.env.NEXT_PUBLIC_BASE_URL}/${user?.username}" frameborder="0" allowfullscreen></iframe>`;
  const htmlTemplate = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${t(
    "schedule_a_meeting"
  )}</title><style>body {margin: 0;}iframe {height: calc(100vh - 4px);width: calc(100vw - 4px);box-sizing: border-box;}</style></head><body>${iframeTemplate}</body></html>`;
  const handleErrors = async (resp: Response) => {
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.message);
    }
    return resp.json();
  };

  const getWebhooks = () => {
    fetch("/api/webhook")
      .then(handleErrors)
      .then((data) => {
        setWebhooks(
          data.webhooks.map((webhook: Webhook) => {
            return {
              ...webhook,
              eventTriggers: webhook.eventTriggers.map((eventTrigger: string) => eventTrigger.toLowerCase()),
            };
          })
        );
        console.log(data.webhooks);
      })
      .catch(console.log);
    setLoading(false);
  };

  const createWebhook = () => {
    setLoading(true);
    fetch("/api/webhook", {
      method: "POST",
      body: JSON.stringify({
        subscriberUrl: subUrlRef.current.value,
        eventTriggers: webhookEventTrigger,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then(getWebhooks)
      .catch(console.log);
  };

  const editWebhook = (webhook: Webhook) => {
    setEditWebhookEnabled(true);
    setWebhookToEdit(webhook);
  };

  const onCloseEdit = () => {
    getWebhooks();
    setEditWebhookEnabled(false);
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <>
      {!editWebhookEnabled && (
        <>
          <ShellSubHeading className="mt-10" title={t("Webhooks")} subtitle={t("receive_cal_meeting_data")} />
          <List>
            <ListItem className={classNames("flex-col")}>
              <div className={classNames("flex flex-1 space-x-2 w-full p-3 items-center")}>
                <Image width={40} height={40} src="/integrations/webhooks.svg" alt="Webhooks" />
                <div className="flex-grow pl-2 truncate">
                  <ListItemTitle component="h3">Webhooks</ListItemTitle>
                  <ListItemText component="p">Automation</ListItemText>
                </div>
                <div>
                  <Dialog>
                    <DialogTrigger>
                      <Button color="secondary">{t("new_webhook")}</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader
                        title={t("create_new_webhook")}
                        subtitle={t("create_new_webhook_to_account")}
                      />
                      <div className="my-4">
                        <div className="mb-4">
                          <label htmlFor="subUrl" className="block text-sm font-medium text-gray-700">
                            {t("subscriber_url")}
                          </label>
                          <input
                            ref={subUrlRef}
                            type="text"
                            name="subUrl"
                            id="subUrl"
                            placeholder="https://example.com/sub"
                            required
                            className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-sm shadow-sm focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                          />
                          <legend className="block pt-4 mb-2 text-sm font-medium text-gray-700">
                            {" "}
                            {t("event_triggers")}{" "}
                          </legend>
                          <div className="p-2 border border-gray-300 rounded-sm">
                            <div className="flex pb-4">
                              <div className="w-10/12">
                                <h2 className="font-medium text-gray-800">{t("booking_created")}</h2>
                              </div>
                              <div className="flex items-center justify-center w-2/12 text-right">
                                <Switch
                                  defaultChecked={true}
                                  id="booking-created"
                                  value={bookingCreated}
                                  onCheckedChange={() => {
                                    setBookingCreated(!bookingCreated);
                                  }}
                                />
                              </div>
                            </div>
                            <div className="flex py-1">
                              <div className="w-10/12">
                                <h2 className="font-medium text-gray-800">{t("booking_rescheduled")}</h2>
                              </div>
                              <div className="flex items-center justify-center w-2/12 text-right">
                                <Switch
                                  defaultChecked={true}
                                  id="booking-rescheduled"
                                  value={bookingRescheduled}
                                  onCheckedChange={() => {
                                    setBookingRescheduled(!bookingRescheduled);
                                  }}
                                />
                              </div>
                            </div>
                            <div className="flex pt-4">
                              <div className="w-10/12">
                                <h2 className="font-medium text-gray-800">{t("booking_cancelled")}</h2>
                              </div>
                              <div className="flex items-center justify-center w-2/12 text-right">
                                <Switch
                                  defaultChecked={true}
                                  id="booking-cancelled"
                                  value={bookingCancelled}
                                  onCheckedChange={() => {
                                    setBookingCancelled(!bookingCancelled);
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="gap-2 mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                          <DialogClose asChild>
                            <Button
                              type="button"
                              loading={isLoading}
                              onClick={createWebhook}
                              color="primary"
                              className="ml-2">
                              {t("create_webhook")}
                            </Button>
                          </DialogClose>
                          <DialogClose asChild>
                            <Button color="secondary">{t("cancel")}</Button>
                          </DialogClose>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </ListItem>
          </List>

          <div className="divide-y divide-gray-200 lg:col-span-9">
            <div className="py-6 lg:pb-8">
              <div>
                {!!webhooks.length && (
                  <WebhookList
                    webhooks={webhooks}
                    onChange={getWebhooks}
                    onEditWebhook={editWebhook}></WebhookList>
                )}
              </div>
            </div>
          </div>

          <ShellSubHeading className="mt-10" title={t("iframe_embed")} subtitle={t("embed_calcom")} />
          <div className="py-6 lg:pb-8 lg:col-span-9">
            <div className="mb-6">
              <h2 className="text-lg font-medium leading-6 text-gray-900 font-cal"></h2>
              <p className="mt-1 text-sm text-gray-500"></p>
            </div>
            <div className="grid grid-cols-2 space-x-4">
              <div>
                <label htmlFor="iframe" className="block text-sm font-medium text-gray-700">
                  {t("standard_iframe")}
                </label>
                <div className="mt-1">
                  <textarea
                    id="iframe"
                    className="block w-full h-32 border-gray-300 rounded-sm shadow-sm focus:ring-black focus:border-black sm:text-sm"
                    placeholder={t("loading")}
                    defaultValue={iframeTemplate}
                    readOnly
                  />
                </div>
              </div>
              <div>
                <label htmlFor="fullscreen" className="block text-sm font-medium text-gray-700">
                  {t("responsive_fullscreen_iframe")}
                </label>
                <div className="mt-1">
                  <textarea
                    id="fullscreen"
                    className="block w-full h-32 border-gray-300 rounded-sm shadow-sm focus:ring-black focus:border-black sm:text-sm"
                    placeholder={t("loading")}
                    defaultValue={htmlTemplate}
                    readOnly
                  />
                </div>
              </div>
            </div>

            <ShellSubHeading className="mt-10" title="Cal.com API" subtitle={t("leverage_our_api")} />
            <a href="https://developer.cal.com/api" className="btn btn-primary">
              {t("browse_api_documentation")}
            </a>
          </div>
        </>
      )}
      {!!editWebhookEnabled && webhookToEdit && (
        <EditWebhook webhook={webhookToEdit} onCloseEdit={onCloseEdit} />
      )}
    </>
  );
}
