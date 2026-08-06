"use client";

import { Truck, RotateCcw, ShieldCheck, Clock, MapPin } from "lucide-react";
import { motion } from "framer-motion";

export default function Shipping() {
  return (
    <div className="bg-background min-h-screen py-10 sm:py-16">
      <div className="container mx-auto px-4 max-w-4xl">

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-16"
        >
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-primary mb-3 sm:mb-4">سياسة التوصيل والاسترجاع</h1>
          <p className="text-sm sm:text-lg text-gray-600 px-2">نضمن لك تجربة تسوق مريحة وآمنة، مع خيارات توصيل تغطي كافة ربوع الوطن.</p>
        </motion.div>

        <div className="space-y-6 sm:space-y-12">

          {/* Shipping Policy */}
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
            className="bg-white p-6 sm:p-8 md:p-12 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 sm:w-32 h-20 sm:h-32 bg-accent/10 rounded-bl-full -z-10"></div>

            <h2 className="text-xl sm:text-3xl font-bold text-primary mb-6 sm:mb-8 flex items-center gap-3">
              <Truck className="text-accent w-7 h-7 sm:w-10 sm:h-10 shrink-0" />
              سياسة التوصيل
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="flex gap-3 sm:gap-4 items-start"
              >
                <div className="bg-primary/5 p-2 sm:p-3 rounded-xl text-primary shrink-0">
                  <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-xl mb-1 sm:mb-2">تغطية 58 ولاية</h3>
                  <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                    نوفر خدمة التوصيل السريع والموثوق لجميع ولايات الجزائر الـ 58، لضمان وصول طلبك أينما كنت.
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex gap-3 sm:gap-4 items-start"
              >
                <div className="bg-primary/5 p-2 sm:p-3 rounded-xl text-primary shrink-0">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-xl mb-1 sm:mb-2">المدة الزمنية المقدرة</h3>
                  <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                    العاصمة والولايات المجاورة: 24 إلى 48 ساعة.<br />
                    باقي الولايات: 3 إلى 5 أيام عمل كحد أقصى.
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.section>

          {/* Returns Policy */}
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-white p-6 sm:p-8 md:p-12 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-20 sm:w-32 h-20 sm:h-32 bg-primary/5 rounded-br-full -z-10"></div>

            <h2 className="text-xl sm:text-3xl font-bold text-primary mb-6 sm:mb-8 flex items-center gap-3">
              <RotateCcw className="text-accent w-7 h-7 sm:w-10 sm:h-10 shrink-0" />
              سياسة الاستبدال والاسترجاع
            </h2>

            <div className="space-y-4 sm:space-y-6 text-gray-600 leading-relaxed">
              <p className="text-sm sm:text-lg">
                نسعى دائماً لرضاكم التام عن جودة منتجاتنا. إذا لم تكن القطعة مطابقة لتوقعاتك، نوفر لك سياسة استرجاع مرنة.
              </p>

              <ul className="space-y-3 sm:space-y-4">
                {[
                  { title: "معاينة الطلب:", text: "يحق لك معاينة الطلب والتأكد من المقاس والجودة عند استلامه من عامل التوصيل قبل الدفع." },
                  { title: "الاستبدال:", text: "يمكنك طلب استبدال المقاس أو الموديل خلال 3 أيام من تاريخ الاستلام، شرط أن يكون القفطان بحالته الأصلية ولم يتم ارتداؤه." },
                  { title: "الاسترجاع:", text: "في حال وجود عيب مصنعي واضح، يمكنك إرجاع القطعة واسترداد المبلغ كاملاً خلال 48 ساعة." },
                ].map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="flex items-start gap-2 sm:gap-3 text-sm sm:text-base"
                  >
                    <ShieldCheck className="text-accent shrink-0 mt-1 w-4 h-4 sm:w-5 sm:h-5" />
                    <span><strong>{item.title}</strong> {item.text}</span>
                  </motion.li>
                ))}
              </ul>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-accent/10 border-r-4 border-accent p-3 sm:p-4 rounded-l-xl mt-4 sm:mt-8"
              >
                <p className="text-primary font-bold text-sm sm:text-base">ملاحظة هامة:</p>
                <p className="text-xs sm:text-sm mt-1">مصاريف التوصيل للاستبدال يتحملها الزبون، إلا في حال كان الخطأ من طرفنا (إرسال مقاس خاطئ أو عيب في القطعة).</p>
              </motion.div>
            </div>
          </motion.section>

        </div>
      </div>
    </div>
  );
}
